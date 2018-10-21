import { Socket } from "net";
import * as shortid from "shortid";
import { createInterface, ReadLine } from "readline";
import SMTPResponse from "./Response";
import { SMTPResponseCode } from "./ResponseCode";
import SMTPServer from "./Server";

import logger from "./Logger";
import SMTPExtension from "./extensions/Extension";
import SMTPMessage from "./Message";
import * as fs from "fs";
import * as path from "path";

export default class SMTPClient {
  public fqdn: string | null = null;
  public ehlo: boolean | null = null;
  public socket: Socket;
  public server: SMTPServer;
  private id: string;
  private reader: ReadLine;
  private message: SMTPMessage = new SMTPMessage();
  private receivingData: boolean = false;

  constructor(server: SMTPServer, socket: Socket) {
    this.id = shortid.generate();
    this.server = server;
    this.socket = socket;
    this._onConnection();
    this.socket.on("close", () => this._onClose());
    this.socket.on("error", (err: Error) => this._onError(err));
    this.recreateReader();
  }

  public write(response: SMTPResponse): void {
    const packet = response.toString();

    // debug
    packet
      .substr(0, packet.length - 2)
      .split("\r\n")
      .forEach((line: string) => {
        logger.debug("[" + this.id + "] > " + line);
      });

    this.socket.write(packet);
  }

  public recreateReader(): void {
    this.reader = createInterface(this.socket);
    this.reader.on("line", (line: string) => this._onLine(line));
  }

  private _onConnection(): void {
    logger.debug("[" + this.id + "] connected");
    this.write(
      new SMTPResponse(
        SMTPResponseCode.ServiceReady,
        this.server.getConfig().host + " ESMTP xensmtp"
      )
    );
  }

  private _onClose(): void {
    logger.debug("[" + this.id + "] disconnected");
  }

  private _onLine(line: string): void {
    if (line.length === 0) {
      return;
    }
    logger.debug("[" + this.id + "] < " + line);
    if (this.receivingData) {
      return this._handleDataLine(line);
    }
    const packet = line.split(" ");
    for (const ext of this.server.extensions) {
      const consumed = ext.hookPacketHandler(this, packet);
      if (consumed) {
        return;
      }
    }
    const header = packet[0].toUpperCase();
    switch (header) {
      case "HELO":
        this._handleHelo(packet);
        break;
      case "EHLO":
        this._handleEhlo(packet);
        break;
      case "MAIL":
        this._handleMail(packet);
        break;
      case "RCPT":
        this._handleRcpt(packet);
        break;
      case "DATA":
        this._handleData();
        break;
      case "QUIT":
        this._handleQuit();
        break;
      case "HELP":
        this._handleHelp();
        break;
      default:
        this.write(
          new SMTPResponse(
            SMTPResponseCode.UnimplementedCommand,
            "Unrecognized command."
          )
        );
    }
  }

  private _handleHelo(packet: string[]): void {
    if (packet.length > 2) {
      this.write(
        new SMTPResponse(
          SMTPResponseCode.TransactionFailed,
          "Invalid HELO/EHLO argument, closing connection."
        )
      );
      this.socket.end();
      return;
    }
    if (packet.length === 0) {
      this.write(
        new SMTPResponse(
          SMTPResponseCode.TransactionFailed,
          "Empty HELO/EHLO argument is not allowed, closing connection."
        )
      );
      this.socket.end();
      return;
    }
    this.fqdn = packet[1];
    this.ehlo = false;
    this.write(
      new SMTPResponse(
        SMTPResponseCode.Success,
        this.server.getConfig().host + " at your service"
      )
    );
  }

  private _handleEhlo(packet: string[]): void {
    if (packet.length > 2) {
      this.write(
        new SMTPResponse(
          SMTPResponseCode.TransactionFailed,
          "Invalid HELO/EHLO argument, closing connection."
        )
      );
      this.socket.end();
      return;
    }
    if (packet.length === 0) {
      this.write(
        new SMTPResponse(
          SMTPResponseCode.TransactionFailed,
          "Empty HELO/EHLO argument is not allowed, closing connection."
        )
      );
      this.socket.end();
      return;
    }
    this.fqdn = packet[1];
    this.ehlo = true;
    let response = [
      this.server.getConfig().host +
        " at your service, [" +
        this.socket.remoteAddress +
        "]"
    ];
    this.server.extensions.forEach(
      (e: SMTPExtension) => (response = e.hookEhloResponse(this, response))
    );
    this.write(new SMTPResponse(SMTPResponseCode.Success, response));
  }

  private _handleQuit(): void {
    this.write(
      new SMTPResponse(SMTPResponseCode.ServiceClosingTransmission, "Goodbye!")
    );
    this.socket.end();
  }

  private _handleHelp(): void {
    this.write(
      new SMTPResponse(
        SMTPResponseCode.ServiceReady,
        "https://tools.ietf.org/html/rfc5321"
      )
    );
  }

  private _handleMail(packet: string[]): void {
    if (packet.length < 2) {
      this.write(
        new SMTPResponse(
          SMTPResponseCode.TransactionFailed,
          "Invalid MAIL argument count, closing connection."
        )
      );
      this.socket.end();
      return;
    }
    const arg1 = packet[1].split(":");
    if (
      arg1.length !== 2 ||
      arg1[0] !== "FROM" ||
      arg1[1][0] !== "<" ||
      arg1[1][arg1[1].length - 1] !== ">"
    ) {
      this.write(
        new SMTPResponse(
          SMTPResponseCode.TransactionFailed,
          "Invalid MAIL argument, closing connection."
        )
      );
      this.socket.end();
      return;
    }
    const sender = arg1[1].substr(1, arg1[1].length - 2);
    this.message.setSender(sender);
    this.write(new SMTPResponse(SMTPResponseCode.ServiceReady, "OK"));
  }

  private _handleRcpt(packet: string[]): void {
    if (packet.length < 2) {
      this.write(
        new SMTPResponse(
          SMTPResponseCode.TransactionFailed,
          "Invalid MAIL argument count, closing connection."
        )
      );
      this.socket.end();
      return;
    }
    const arg = packet[1].split(":");
    if (
      arg.length !== 2 ||
      arg[0] !== "TO" ||
      arg[1][0] !== "<" ||
      arg[1][arg[1].length - 1] !== ">"
    ) {
      this.write(
        new SMTPResponse(
          SMTPResponseCode.TransactionFailed,
          "Invalid MAIL argument, closing connection."
        )
      );
      this.socket.end();
      return;
    }
    const recipient = arg[1].substr(1, arg[1].length - 2);
    this.message.setRecipient(recipient);
    this.write(new SMTPResponse(SMTPResponseCode.ServiceReady, "OK"));
  }

  private _handleData(): void {
    this.receivingData = true;
    this.write(
      new SMTPResponse(SMTPResponseCode.StartInput, "Go ahead, I'm listening.")
    );
  }

  private _handleDataLine(line: string): void {
    if (line === ".") {
      this.receivingData = false;
      this._sendMail();
      return;
    }
    this.message.appendDataLine(line);
  }

  private _onError(err: Error): void {
    // ignore the error completely for now
  }

  private _sendMail(): void {
    const uemn = Date.now() + "_" + shortid.generate();
    fs.writeFileSync(
      path.resolve(this.server.getConfig().maildir + "/" + uemn + ".mail"),
      this.message.getData()
    );
    logger.info(
      "Accepted e-mail: " +
        uemn +
        " from: <" +
        this.message.getSender() +
        "> to: <" +
        this.message.getRecipient() +
        ">"
    );
    this.write(new SMTPResponse(SMTPResponseCode.Success, "OK"));
  }
}

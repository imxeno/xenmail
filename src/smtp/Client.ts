import { Socket } from "net";
import * as shortid from "shortid";
import { createInterface, ReadLine } from "readline";
import SMTPResponse from "./Response";
import { SMTPResponseCode } from "./ResponseCode";
import SMTPServer from "./Server";
import { TLSSocket, createSecureContext } from "tls";

import logger from "./Logger";
import SMTPExtension from "./extensions/Extension";
import SMTPMessage from "./Message";

export default class SMTPClient {
  private id: string;
  private server: SMTPServer;
  private socket: Socket;
  private reader: ReadLine;
  private fqdn: string | null = null;
  private ehlo: boolean | null = null;
  private message: SMTPMessage = new SMTPMessage();
  private receivingData: boolean = false;

  constructor(server: SMTPServer, socket: Socket) {
    this.id = shortid.generate();
    this.server = server;
    this.socket = socket;
    this.reader = createInterface(socket);
    this.reader.on("line", (line: string) => this._onLine(line));
    this._onConnection();
    this.socket.on("close", () => this._onClose());
    this.socket.on("error", (err: Error) => logger.error(err));
  }

  private write(response: SMTPResponse): void {
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
    const header = packet[0].toUpperCase();
    switch (header) {
      case "HELO":
        this._handleHelo(packet);
        break;
      case "EHLO":
        this._handleEhlo(packet);
        break;
      case "STARTTLS":
        if (this.fqdn === null) {
          this.write(
            new SMTPResponse(SMTPResponseCode.BadSequence, "EHLO/HELO first.")
          );
          break;
        }
        this.write(
          new SMTPResponse(
            SMTPResponseCode.ServiceReady,
            "Okay, lets negotiate then. You go first."
          )
        );
        this.socket = new TLSSocket(this.socket, {
          isServer: true,
          server: this.server.getSocket(),
          secureContext: createSecureContext({
            cert: this.server.getConfig().ssl.cert,
            key: this.server.getConfig().ssl.key
          })
        });
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
        SMTPResponseCode.ServiceReady,
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
    this.write(new SMTPResponse(SMTPResponseCode.ServiceReady, response));
  }

  private _handleQuit(): void {
    this.write(new SMTPResponse(SMTPResponseCode.Success, "Goodbye!"));
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
      this.write(new SMTPResponse(SMTPResponseCode.Success, "OK"));
      return;
    }
    this.message.appendDataLine(line);
  }
}

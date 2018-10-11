import { Socket } from "net";
import * as shortid from "shortid";
import { createInterface, ReadLine } from "readline";
import SMTPResponse from "./Response";
import { SMTPResponseCode } from "./ResponseCode";
import SMTPServer from "./Server";
import { TLSSocket } from "tls";

import logger from "./Logger";
import SMTPExtension from "./extensions/Extension";

export default class SMTPClient {
  private id: string;
  private server: SMTPServer;
  private socket: Socket;
  private reader: ReadLine;
  private fqdn: string | null = null;
  private ehlo: boolean | null = null;

  constructor(server: SMTPServer, socket: Socket) {
    this.id = shortid.generate();
    this.server = server;
    this.socket = socket;
    this.reader = createInterface(socket);
    this.reader.on("line", (line: string) => this._onLine(line));
    this._onConnection();
  }

  private write(response: SMTPResponse): void {
    const packet = response.toString();
    logger.debug("[" + this.id + "] > " + packet.substr(0, packet.length - 2));
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

  private _onLine(line: string): void {
    if (line.length === 0) {
      return;
    }
    logger.debug("[" + this.id + "] < " + line);
    const packet = line.split(" ");
    const header = packet[0].toUpperCase();
    switch (header) {
      case "HELO":
        if (packet.length > 2) {
          this.write(
            new SMTPResponse(
              SMTPResponseCode.TransactionFailed,
              "Invalid HELO/EHLO argument, closing connection."
            )
          );
          this.socket.end();
        }
        if (packet.length === 0) {
          this.write(
            new SMTPResponse(
              SMTPResponseCode.TransactionFailed,
              "Empty HELO/EHLO argument is not allowed, closing connection."
            )
          );
          this.socket.end();
        }
        this.fqdn = packet[1];
        this.ehlo = false;
        this.write(
          new SMTPResponse(
            SMTPResponseCode.ServiceReady,
            this.server.getConfig().host + " at your service"
          )
        );
        break;
      case "EHLO":
        if (packet.length > 2) {
          this.write(
            new SMTPResponse(
              SMTPResponseCode.TransactionFailed,
              "Invalid HELO/EHLO argument, closing connection."
            )
          );
          this.socket.end();
        }
        if (packet.length === 0) {
          this.write(
            new SMTPResponse(
              SMTPResponseCode.TransactionFailed,
              "Empty HELO/EHLO argument is not allowed, closing connection."
            )
          );
          this.socket.end();
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
        break;
      case "HELP":
        this.write(
          new SMTPResponse(
            SMTPResponseCode.ServiceReady,
            "https://tools.ietf.org/html/rfc5321"
          )
        );
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
          server: this.server.getSocket()
        });
        break;
      case "QUIT":
        this.write(new SMTPResponse(SMTPResponseCode.Success, "Goodbye!"));
        this.socket.end();
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
}

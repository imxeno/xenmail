import { Socket } from "net";
import { createInterface, ReadLine } from "readline";
import SMTPResponse from "./Response";
import { SMTPResponseCode } from "./ResponseCode";
import SMTPServer from "./Server";

export default class SMTPClient {
  private server: SMTPServer;
  private socket: Socket;
  private reader: ReadLine;
  private fqdn: string | null = null;

  constructor(server: SMTPServer, socket: Socket) {
    this.server = server;
    this.socket = socket;
    this.reader = createInterface(socket);
    this.reader.on("line", (line: string) => this._onLine(line));
    this._onConnection();
  }

  private write(response: SMTPResponse): void {
    this.socket.write(response.toString());
  }

  private _onConnection(): void {
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
    const packet = line.split(" ");
    const header = packet[0].toUpperCase();
    switch (header) {
      case "HELO":
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

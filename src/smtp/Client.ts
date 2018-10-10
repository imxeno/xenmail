import { Socket } from "net";
import { createInterface, ReadLine } from "readline";
import SMTPResponse from "./Response";
import { SMTPResponseCode } from "./ResponseCode";
import SMTPServer from "./Server";

export default class SMTPClient {
  private server: SMTPServer;
  private socket: Socket;
  private reader: ReadLine;
  private fqdn: string;

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
    const splitted = line.split(" ");
    const header = splitted[0].toUpperCase();
    switch (header) {
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

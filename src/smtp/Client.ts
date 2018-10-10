import { Socket } from "net";
import { createInterface, ReadLine } from "readline";
import SMTPResponse from "./Response";
import { SMTPResponseCode } from "./ResponseCode";
import SMTPServer from "./Server";

export default class SMTPClient {
  private server: SMTPServer;
  private socket: Socket;
  private reader: ReadLine;

  constructor(server: SMTPServer, socket: Socket) {
    this.server = server;
    this.socket = socket;
    this.reader = createInterface(socket);
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
}

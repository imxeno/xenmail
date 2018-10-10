import { Server, Socket } from "net";
import SMTPClient from "./Client";

interface SMTPServerConfig {
  host: string;
}

export default class SMTPServer {
  private config: SMTPServerConfig;
  private server: Server;
  constructor(config: SMTPServerConfig) {
    this.config = config;
    this.server = new Server();
    this.server.on(
      "connection",
      (socket: Socket) => new SMTPClient(this, socket)
    );
  }
  public listen(port: number): void {
    this.server.listen(port);
  }
  public getConfig(): SMTPServerConfig {
    return this.config;
  }
}

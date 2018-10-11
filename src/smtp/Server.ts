import { Server, Socket } from "net";
import SMTPClient from "./Client";
import SMTPExtension from "./extensions/Extension";
import SMTPStartTlsExtension from "./extensions/StartTlsExtension";

interface SMTPServerSSLConfig {
  allow: boolean;
  force: boolean;
  cert: Buffer;
  key: Buffer;
}

interface SMTPServerConfig {
  host: string;
  ssl: SMTPServerSSLConfig;
  maildir: string;
}

export default class SMTPServer {
  private config: SMTPServerConfig;
  private server: Server;
  public extensions: SMTPExtension[] = [new SMTPStartTlsExtension()];
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
  public getSocket(): Server {
    return this.server;
  }
}

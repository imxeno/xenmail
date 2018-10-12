import SMTPExtension from "./Extension";
import SMTPResponse from "../Response";
import { SMTPResponseCode } from "../ResponseCode";
import SMTPClient from "../Client";
import { TLSSocket, createSecureContext } from "tls";

export default class SMTPStartTlsExtension implements SMTPExtension {
  public hookEhloResponse(client: SMTPClient, response: string[]): string[] {
    return [...response, "STARTTLS"];
  }

  public hookPacketHandler(client: SMTPClient, packet: string[]): boolean {
    const header = packet[0].toUpperCase();
    if (header === "STARTTLS") {
      this._handleStartTls(client);
      return true;
    }
    return false;
  }

  private _handleStartTls(client: SMTPClient): void {
    if (client.fqdn === null) {
      client.write(
        new SMTPResponse(SMTPResponseCode.BadSequence, "EHLO/HELO first.")
      );
      return;
    }
    client.write(
      new SMTPResponse(
        SMTPResponseCode.ServiceReady,
        "Okay, lets negotiate then. You go first."
      )
    );
    client.socket = new TLSSocket(client.socket, {
      isServer: true,
      server: client.server.getSocket(),
      secureContext: createSecureContext({
        cert: client.server.getConfig().ssl.cert,
        key: client.server.getConfig().ssl.key
      })
    });
    client.recreateReader();
  }
}

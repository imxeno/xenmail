import SMTPExtension from "./Extension";
import { Socket } from "net";
import SMTPClient from "../Client";

export default class SMTPStartTlsExtension implements SMTPExtension {
  public hookEhloResponse(client: SMTPClient, response: string[]): string[] {
    return [...response, "STARTTLS"];
  }
}

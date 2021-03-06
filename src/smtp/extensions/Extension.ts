import { Socket } from "net";
import SMTPClient from "../Client";

export default interface SMTPExtension {
  hookEhloResponse(client: SMTPClient, response: string[]): string[];
}

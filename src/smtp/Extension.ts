import { Socket } from "net";

export default interface SMTPExtension {
  hookEhloResponse(socket: Socket, response: string[]): string[];
}

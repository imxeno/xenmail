import { SMTPResponseCode } from "./ResponseCode";

export default class SMTPResponse {
  private code: SMTPResponseCode;
  private message: string[];
  constructor(code: SMTPResponseCode, message: string[] | string) {
    this.code = code;
    this.message = message instanceof Array ? message : [message];
  }
  public toString(): string {
    let packet = "";
    for (let i = 0; i < this.message.length; i++) {
      packet +=
        this.code +
        (i === this.message.length - 1 ? " " : "-") +
        this.message[i] +
        "\r\n";
    }
    return packet;
  }
}

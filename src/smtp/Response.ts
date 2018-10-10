import { SMTPResponseCode } from "./ResponseCode";

export default class SMTPResponse {
  private code: SMTPResponseCode;
  private message: string;
  constructor(code: SMTPResponseCode, message: string) {
    this.code = code;
    this.message = message;
  }
  public toString(): string {
    return this.code + " " + this.message + "\r\n";
  }
}

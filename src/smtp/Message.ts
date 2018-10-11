export default class SMTPMessage {
  private sender: string;
  private recipient: string;
  private data: string[] = [];
  public setSender(sender: string): void {
    this.sender = sender;
  }
  public setRecipient(recipient: string): void {
    this.recipient = recipient;
  }
  public appendDataLine(line: string): void {
    this.data.push(line);
  }
  public getSender(): string {
    return this.sender;
  }
  public getRecipient(): string {
    return this.recipient;
  }
  public getData(): string {
    return this.data.join("\r\n");
  }
}

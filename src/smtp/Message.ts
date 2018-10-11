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
}

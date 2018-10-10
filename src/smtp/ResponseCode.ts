export const enum SMTPResponseCode {
  SuccessAlt = 200, // (nonstandard success response, see rfc876)
  SystemStatus = 211, // System status, or system help reply
  Help = 214, // Help message
  ServiceReady = 220, // <domain> Service ready
  ServiceClosingTransmission = 221, // <domain> Service closing transmission channel
  Success = 250, // Requested mail action okay, completed
  WillForward = 251, // User not local, will forward to <forward-path>
  CannotVerifyButAccepted = 252, // Cannot VRFY user, but will accept message and attempt delivery
  StartInput = 354, // Start mail input, end with <CRLF>.<CRLF>
  MailActionServiceNotAvailable = 421, // <domain> Service not available, closing transmission channel
  MailboxUnavailable = 450, // Requested mail action not taken: mailbox unavailable
  LocalError = 451, // Requested action aborted: local error in processing
  InsufficientStorage = 452, // Requested action not taken: insufficient system storage
  CommandUnrecognized = 500, // Syntax error, command unrecognised
  SyntaxError = 501, // Syntax error in parameters or arguments
  UnimplementedCommand = 502, // Command not implemented
  BadSequence = 503, // Bad sequence of commands
  UnimplementedParameter = 504, // Command parameter not implemented
  DomainDoesNotAcceptMail = 521, // <domain> does not accept mail (see rfc1846)
  AccessDenied = 530, // Access denied (???a Sendmailism)
  ActionMailboxUnanavailable = 550, // Requested action not taken: mailbox unavailable
  TryForward = 551, // User not local, please try <forward-path>
  ExceededStorageAllocation = 552, // Requested mail action aborted: exceeded storage allocation
  MailboxNameNotAllowed = 553, // Requested action not taken: mailbox name not allowed
  TransactionFailed = 554 // Transaction failed
}

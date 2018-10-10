import SMTPServer from "./smtp/Server";
import config from "../config";
const SMTP = new SMTPServer(config.smtp);
SMTP.listen(587);

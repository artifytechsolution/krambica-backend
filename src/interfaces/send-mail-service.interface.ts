export interface SendMailOptions {
  to: string;
  subject: string;
  title: string;
  body: string;
  footer?: string;
}

export interface IEmailService {
  /**
   * Sends an email using the given options
   * @param options - Details for email content and recipient
   */
  sendEmail(options: SendMailOptions): Promise<void>;
}

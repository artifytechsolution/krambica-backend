import nodemailer from 'nodemailer';
import { injectable } from './di-container';
import { IConfigService } from './config.service';
import { SendMailOptions } from '../interfaces/send-mail-service.interface';

@injectable()
export class EmailService {
  static dependencies = ['ConfigService'];

  private transporter: nodemailer.Transporter;

  constructor(private configService: IConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.getNumber('SMTP_PORT') || 587,
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  private buildHtmlTemplate(
    title: string,
    body: string,
    footer?: string,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #333;">${title}</h2>
        <div style="font-size: 15px; color: #444; margin-top: 10px;">
          ${body}
        </div>
        ${
          footer
            ? `<hr style="margin: 30px 0;" />
               <div style="font-size: 12px; color: #999;">${footer}</div>`
            : ''
        }
      </div>
    `;
  }

  async sendEmail(options: SendMailOptions): Promise<void> {
    console.log('host is hereee-----');
    console.log(this.configService.get('SMTP_HOST'));
    const fromEmail =
      this.configService.get('SMTP_FROM') ||
      this.configService.get('SMTP_USER')!;

    console.log('hello smtp  send user is here----------');
    console.log(this.configService.get('SMTP_USER'));

    const html = this.buildHtmlTemplate(
      options.title,
      options.body,
      options.footer,
    );

    const mailOptions = {
      from: `"No Reply" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent: ${info.messageId}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }
}

import { injectable } from '../../services/di-container';
import { IService } from '../../interfaces/service.interface';
import { ILoggerService } from '../../services/logger.service';
import { IAuthService } from '../../interfaces/auth-service.interface';
import { Auth, loginuserInput, UserInput } from './auth.types';
import { InvalidInputError } from '../../utils/error.utils';
import { executePrismaOperation, PrismaOperationType } from '../../utils/prisma.utils';
import { IDatabaseService } from '../../interfaces/database-service.interface';
import Encryptpassword from '../../utils/encryptpasswors';
import { User } from '../../generated/prisma';
import JwtToken from '../../utils/jwtToken.utils';
import { IConfigService } from '../../services/config.service';
import _, { add, omit } from 'lodash';

import { IEmailService } from '../../interfaces/send-mail-service.interface';

@injectable()
export class AuthService implements IService, IAuthService {
  static dependencies = ['LoggerService', 'DatabaseService', 'ConfigService', 'EmailService'];
  static optionalDependencies: string[] = [];

  private auth: Auth[] = [
    { id: 1, name: 'Sample Auth 1', createdAt: new Date().toISOString() },
    { id: 2, name: 'Sample Auth 2', createdAt: new Date().toISOString() },
  ];

  private db: IDatabaseService;
  private logger: ILoggerService;
  private config: IConfigService;
  private JWT_SECRET: string;
  private REFRESH_SECRET: string;
  private mailConfig: IEmailService;

  constructor(
    logger: ILoggerService,
    db: IDatabaseService,
    config: IConfigService,
    mail: IEmailService,
  ) {
    this.logger = logger;
    this.logger.info('AuthService instantiated');
    this.db = db;
    this.config = config;
    this.JWT_SECRET = this.config.get('JWT_ACCESS_SECRET') as string;
    this.REFRESH_SECRET = this.config.get('REFRESH_ACCESS_SECRET') as string;
    this.mailConfig = mail;
  }

  async Login(data: loginuserInput): Promise<any> {
    const user: any = await executePrismaOperation<User>(
      'user',
      {
        operation: PrismaOperationType.READ,
        where: {
          email: data.email,
        },
      },
      this.db.client,
      this.logger,
    );
    console.log('user is comming -------');
    console.log(user);

    if (!user || !user.data || user.data.length === 0) {
      throw new InvalidInputError('user is not exist 123');
    }

    const foundUser = user.data[0];

    const password = Encryptpassword.DycryptPassword(
      foundUser.password,
      data.password,
      foundUser.salt,
    );

    if (!password) {
      throw new InvalidInputError('Invalid credentials');
    }

    const accessToken = JwtToken.createToken(
      {
        id: foundUser.id,
        user_id: foundUser.user_id,
      },
      this.JWT_SECRET ?? '',
      {
        expiresIn: '10h',
      },
    );
    console.log('acessToken is hereeeeee');
    console.log(accessToken);

    let refreshTokenData;

    if (data.refreshToken) {
      const findToken = await executePrismaOperation(
        'user',
        {
          operation: PrismaOperationType.READ,
          where: {
            email: data.email,
          },
        },
        this.db.client,
        this.logger,
      );

      if (!findToken || !findToken.data || findToken.data.length === 0) {
        throw new InvalidInputError('Refrersh Token is not exist');
      }

      const dbToken = findToken.data[0].refreshToken;

      if (dbToken === data.refreshToken) {
        refreshTokenData = dbToken;
      } else {
        throw new InvalidInputError('Refresh token mismatch');
      }
    } else {
      const newrefreshToken = JwtToken.createToken(
        {
          id: foundUser.id,
          user_id: foundUser.user_id,
        },
        this.REFRESH_SECRET ?? '',
        { expiresIn: '20m' },
      );
      refreshTokenData = newrefreshToken;

      const user = await executePrismaOperation(
        'user',
        {
          operation: PrismaOperationType.UPDATE,
          where: {
            email: data.email,
          },
          data: {
            refreshToken: newrefreshToken,
          },
        },
        this.db.client,
        this.logger,
      );
    }
    return {
      user: _.omit(foundUser, [
        'refreshToken',
        'Otp',
        'is_verified',
        'createdAt',
        'updatedAt',
        'deletedAt',
        'salt',
        'password',
      ]),

      token: {
        acessToken: accessToken,
        refreshToken: refreshTokenData,
      },
    };
  }

  async RefreshToken(refreshToken: string) {
    console.log('hello service is calle');
    if (!refreshToken) {
      throw new InvalidInputError('Token is not found');
    }

    const decoded: {
      id: string;
      user_id: string;
    } = JwtToken.verifyToken(refreshToken, this.REFRESH_SECRET);
    console.log('devcoded is ');
    console.log(decoded);
    const user: any = await executePrismaOperation<User>(
      'user',
      {
        operation: PrismaOperationType.READ_UNIQUE,
        where: { user_id: decoded.user_id },
      },
      this.db.client,
      this.logger,
    );
    if (
      !user ||
      user.data.refreshToken !== refreshToken ||
      user.data.refreshToken == undefined ||
      null
    ) {
      throw new InvalidInputError('user and refreshToken is not exist');
    }
    const refreshTokenVerify = JwtToken.verifyToken(user.data.refreshToken, this.REFRESH_SECRET);

    const newAccessToken = JwtToken.createToken(
      {
        id: user.data.id,
        user_id: user.data.user_id,
      },
      this.JWT_SECRET ?? '',
      { expiresIn: '1m' },
    );
    if (!refreshTokenVerify) {
      const newRefreshToken = JwtToken.createToken(
        {
          id: user.data.id,
          user_id: user.data.user_id,
        },
        this.REFRESH_SECRET ?? '',
        { expiresIn: '20m' },
      );
      console.log('create a new refresh tokennnnn');
      console.log(newRefreshToken);
      await executePrismaOperation<User>(
        'user',
        {
          operation: PrismaOperationType.UPDATE,
          where: {
            email: user.data.email,
          },
          data: {
            refreshToken: newRefreshToken,
          },
        },
        this.db.client,
        this.logger,
      );
      return {
        acessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    }

    return {
      acessToken: newAccessToken,
      refreshToken: user.refreshToken,
    };
  }

  async initialize() {
    this.logger.info('AuthService initialized with in-memory data');
  }

  async getAll(): Promise<any> {
    try {
      const user = await executePrismaOperation<any>(
        'user',
        {
          operation: PrismaOperationType.READ,
          include: {
            profile: true,
            addresses: true,
          },
        },
        this.db.client,
        this.logger,
      );

      if (!user || !Array.isArray(user.data)) {
        throw new InvalidInputError('Users not found');
      }

      const sanitizedUsers = user.data.map((u: any) =>
        _.omit(u, [
          'refreshToken',
          'Otp',
          'is_verified',
          'createdAt',
          'updatedAt',
          'deletedAt',
          'salt',
          'password',
        ]),
      );

      return sanitizedUsers;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async getById(id: string): Promise<any | undefined> {
    try {
      const user = await executePrismaOperation<any>(
        'user',
        {
          operation: PrismaOperationType.READ_UNIQUE,
          where: parseInt(id) ? { user_id: parseInt(id) } : { id: id },
        },
        this.db.client,
        this.logger,
      );
      console.log('user is comming on dataa......');
      console.log(user);
      if (!user.data) {
        throw new InvalidInputError('user is not found');
      }

      return await _.omit(user.data, [
        'refreshToken',
        'Otp',
        'is_verified',
        'createdAt',
        'updatedAt',
        'deletedAt',
        'salt',
        'password',
      ]);
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async create(data: Omit<UserInput, 'id' | 'createdAt'>): Promise<any> {
    try {
      const userExist = await executePrismaOperation<'UserInput'>(
        'user',
        {
          operation: PrismaOperationType.READ,
          where: {
            email: data.email,
          },
        },
        this.db.client,
        this.logger,
      );
      if (userExist.data.length > 0) {
        throw new InvalidInputError('user is already exist');
      }
      const { password, salt } = Encryptpassword.Encryptpassword(data.password);
      const result = await executePrismaOperation<'UserInput'>(
        'user',
        {
          operation: PrismaOperationType.CREATE,
          data: {
            ...data,
            password,
            salt,
          },
        },
        this.db.client,
        this.logger,
      );
      const updatedUser = _.omit(result.data, [
        'refreshToken',
        'Otp',
        'is_verified',
        'createdAt',
        'updatedAt',
        'deletedAt',
        'salt',
        'password',
      ]);
      return updatedUser;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }

  async update(id: string, data: any): Promise<any> {
    console.log('main id is here for update');
    console.log(id);
    const user = await this.db.client.user.findUnique({
      where: { id: id, deletedAt: null },
    });
    console.log(id);
    console.log('data is comming for update');
    console.log(data);
    console.log('user is comming for update');
    console.log(user);

    if (!user) {
      throw new InvalidInputError('User not found');
    }

    // If updating email, check if new email already exists
    if (data.email && data.email !== user.email) {
      const existingUser = await this.db.client.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new InvalidInputError('Email already in use');
      }
    }

    // Update user
    const updateddata = await this.db.client.user.update({
      where: { user_id: user.user_id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        profile: true,
      },
    });
    return _.omit(updateddata, [
      'refreshToken',
      'Otp',
      'is_verified',
      'createdAt',
      'updatedAt',
      'deletedAt',
      'salt',
      'password',
    ]);
  }

  async delete(id: string): Promise<boolean> {
    // Check if user exists
    const user = await this.db.client.user.findUnique({
      where: { id: id, deletedAt: null },
    });

    if (!user) {
      throw new InvalidInputError('User not found');
    }

    // Soft delete - set deletedAt timestamp
    await this.db.client.user.update({
      where: { user_id: user.user_id },
      data: {
        deletedAt: new Date(),
      },
    });

    return true;
  }

  generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // ensures 6-digit OTP
  }

  async sendOtp(data: any) {
    console.log('data is comming------------');
    console.log(data);
    const otp = this.generateOtp();
    console.log('otp is generated', otp);
    const user: any = await executePrismaOperation<User>(
      'user',
      {
        operation: PrismaOperationType.READ,
        where: {
          email: data,
        },
      },
      this.db.client,
      this.logger,
    );

    await executePrismaOperation<User>(
      'user',
      {
        operation: PrismaOperationType.UPDATE,
        where: { email: data },
        data: {
          Otp: '1234',
        },
      },
      this.db.client,
      this.logger,
    );
    try {
      await this.mailConfig.sendEmail({
        title: 'Your OTP Code',
        body: `Hello, your One-Time Password (OTP) is: ${otp}`,
        to: data,
        subject: 'Your OTP Code',
        footer: 'Do not share this OTP with anyone.',
      });
    } catch (error: any) {
      throw new InvalidInputError(error.message || 'Failed to send OTP email');
    }
  }
  async createAddress(data: any): Promise<any> {
    try {
      const {
        user_id,
        fullName,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        zipCode,
        country,
        isDefault,
        addressType,
      } = data;

      const userExist = await executePrismaOperation<'UserInput'>(
        'user',
        {
          operation: PrismaOperationType.READ,
          where: {
            id: data.user_id,
          },
        },
        this.db.client,
        this.logger,
      );
      if (userExist.data.length <= 0) {
        throw new InvalidInputError('user is not exist');
      }
      console.log(userExist.data[0].user_id);

      const result = await this.db.client.address.create({
        data: {
          user_id: userExist.data[0].user_id,
          fullName,
          phone,
          addressLine1,
          addressLine2,
          city,
          state,
          zipCode,
          country,
          isDefault: isDefault || false,
          addressType,
        },
      });

      return result;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }
  async AddressList(data: any): Promise<any> {
    try {
      const userExist = await executePrismaOperation<'UserInput'>(
        'user',
        {
          operation: PrismaOperationType.READ,
          where: {
            email: data.email,
          },
        },
        this.db.client,
        this.logger,
      );
      if (userExist.data.length <= 0) {
        throw new InvalidInputError('user is not exist');
      }

      const result = await this.db.client.address.findMany({
        where: {
          user_id: userExist.data.user_id,
        },
      });

      return result;
    } catch (error: any) {
      throw new InvalidInputError(error.message);
    }
  }
}

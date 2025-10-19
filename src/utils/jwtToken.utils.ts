import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import env from 'dotenv';
env.config();

class JwtToken {
  /**
   * Create a new JWT token
   * @param data Payload to sign
   * @param secretKey Secret key
   * @param options Sign options (e.g., expiresIn)
   * @returns JWT string
   */
  static createToken(
    data: any,
    secretKey: string,
    options?: SignOptions,
  ): string {
    return jwt.sign(data, secretKey, options);
  }

  /**
   * Verify a JWT token
   * @param token JWT string
   * @param secretKey Secret key
   * @returns Decoded payload
   */
  static verifyToken<T = JwtPayload>(token: string, secretKey: string): T {
    return jwt.verify(token, secretKey) as T;
  }

  /**
   * Decode JWT without verifying signature
   * @param token JWT string
   * @returns Decoded data or null
   */
  static decodeToken(token: string): JwtPayload | null {
    return jwt.decode(token) as JwtPayload | null;
  }
}

export default JwtToken;

import * as crypto from 'crypto';

export default class Encryptpassword {
  static Encryptpassword(password: string) {
    const salt = crypto.randomBytes(32).toString('hex');
    const getHash = crypto
      .pbkdf2Sync(password, salt, 10000, 67, 'sha512')
      .toString('hex');
    return {
      salt,
      password: getHash,
    };
  }
  static DycryptPassword(
    oldpassword: string,
    loginpassword: string,
    salt: string,
  ) {
    const password2 = crypto
      .pbkdf2Sync(loginpassword, salt, 10000, 67, 'sha512')
      .toString('hex');
    if (password2 == oldpassword) {
      return true;
    }
    return false;
  }
}

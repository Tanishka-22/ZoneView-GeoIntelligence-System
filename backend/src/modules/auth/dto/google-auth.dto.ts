/**
 * Shape of the data we extract from Google's profile response.
 * This is what GoogleStrategy.validate() returns.
 */
export class GoogleAuthDto {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string;
}
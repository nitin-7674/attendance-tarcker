export interface User {
  id: string;
  name: string;
  email: string;
  preferences: Record<string, unknown>;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface Registration extends Credentials {
  name: string;
  confirmPassword: string;
}

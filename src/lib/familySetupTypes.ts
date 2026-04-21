export type ChildAccountMode = 'email' | 'username';

export interface FamilySetupAuthDraft {
  mode: 'google' | 'username';
  username: string;
}

export interface FamilySetupChildDraft {
  firstName: string;
  lastName: string;
  birthdate: string;
  accountMode: ChildAccountMode;
  email: string;
  username: string;
  starterPassword: string;
  choresInput: string;
  chores: string[];
}

export interface FamilySetupDraft {
  parentAuth: FamilySetupAuthDraft;
  parent: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  familyName: string;
  familyNameManuallyEdited: boolean;
  spouse: {
    enabled: boolean;
    email: string;
  };
  children: FamilySetupChildDraft[];
}

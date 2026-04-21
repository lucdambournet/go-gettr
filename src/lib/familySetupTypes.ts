export type ChildAccountMode = 'email' | 'username';

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

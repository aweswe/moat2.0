export type Profile = {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    created_at: string;
};

export type Organization = {
    id: string;
    name: string;
    slug: string;
    created_at: string;
};

export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Omit<Profile, 'created_at'>;
                Update: Partial<Omit<Profile, 'created_at' | 'id'>>;
            };
            organizations: {
                Row: Organization;
                Insert: Omit<Organization, 'created_at'>;
                Update: Partial<Omit<Organization, 'created_at' | 'id'>>;
            };
        };
    };
};

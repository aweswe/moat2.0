export type ApiResponse<T> = {
    data?: T;
    error?: string;
    success: boolean;
};

export type AuthResponse = ApiResponse<{
    user_id: string;
    org_id: string;
}>;

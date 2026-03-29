// Content Generation Response from OpenAI
export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Generated Post in our database
export interface GeneratedPost {
  id: number;
  source_url: string;
  original_content: string;
  generated_content: string;
  title: string;
  excerpt?: string;
  openai_response: OpenAIResponse | null;
  wordpress_post_id?: number;
  status: 'pending' | 'published' | 'failed';
  created_at: Date;
  updated_at: Date;
}

// WordPress Post Payload
export interface WordPressPostPayload {
  title: string;
  content: string;
  excerpt?: string;
  status?: 'publish' | 'draft' | 'pending';
  content_generator_id?: number;
}

// API Request/Response Types
export interface GeneratePostRequest {
  url: string;
}

export interface GeneratePostResponse {
  id: number;
  status: string;
  title: string;
  content: string;
  source_url: string;
}

export interface PostStatusResponse {
  id: number;
  status: string;
  wordpress_post_id?: number;
  created_at: Date;
  updated_at: Date;
}

// JWT Token Claims
export interface JWTClaims {
  sub: string;
  iat: number;
  exp: number;
  email?: string;
}

// Error Response
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    timestamp: string;
  };
}

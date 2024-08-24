
declare type SpotifyPlayistJson = {
  href: string;
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
  items: Record<string, any>[];
}

declare type SpotifyError = {
  status: number,
  message: string
}

declare type SpotifyTokenJson = {
  access_token: string,
  token_type: string,
  display_name: string
}
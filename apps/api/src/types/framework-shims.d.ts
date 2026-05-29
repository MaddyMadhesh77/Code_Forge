declare module '@nestjs/common' {
  export function Injectable(): any;
  export function Controller(path?: string): any;
  export function Post(path?: string): any;
  export function Get(path?: string): any;
  export function Put(path?: string): any;
  export function Delete(path?: string): any;
  export function Param(name?: string): any;
  export function Body(): any;
  export function UseGuards(...guards: any[]): any;
  export function Query(name?: string): any;
  export function Req(): any;
  export class BadRequestException extends Error {}
  export class UnauthorizedException extends Error {}
  export class Logger {
    constructor(context?: string);
    log(message: string): void;
    warn(message: string): void;
  }
}

declare module '@nestjs/websockets' {
  export function WebSocketGateway(config?: any): any;
  export function WebSocketServer(): any;
  export function SubscribeMessage(event: string): any;
  export function ConnectedSocket(): any;
  export function MessageBody(): any;
  export interface OnGatewayConnection {}
  export interface OnGatewayDisconnect {}
}

declare module 'socket.io' {
  export class Server {
    to(room: string): { emit: (event: string, payload?: any) => void };
    emit(event: string, payload?: any): void;
  }

  export class Socket {
    id: string;
    join(room: string): void;
    to(room: string): { emit: (event: string, payload?: any) => void };
    emit(event: string, payload?: any): void;
  }
}

declare module 'class-validator' {
  export function IsUUID(): any;
  export function IsString(): any;
  export function IsOptional(): any;
  export function IsEnum(values: any, opts?: any): any;
  export function IsNumber(): any;
  export function Min(n: number): any;
  export function Max(n: number): any;
}

declare module 'nodemailer' {
  const nodemailer: {
    createTransport(config: any): { sendMail(payload: any): Promise<any> };
  };
  export default nodemailer;
}

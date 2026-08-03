import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsNotEmpty({ message: 'Application ID is required.' })
  @IsString()
  applicationId: string;
}

export class VerifyPaymentDto {
  @IsNotEmpty({ message: 'Razorpay Order ID is required.' })
  @IsString()
  razorpayOrderId: string;

  @IsNotEmpty({ message: 'Razorpay Payment ID is required.' })
  @IsString()
  razorpayPaymentId: string;

  @IsNotEmpty({ message: 'Razorpay Signature is required.' })
  @IsString()
  razorpaySignature: string;
}

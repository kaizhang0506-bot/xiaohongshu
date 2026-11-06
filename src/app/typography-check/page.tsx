import { notFound } from 'next/navigation';
import { TypographyCheck } from './TypographyCheck';

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <TypographyCheck />;
}

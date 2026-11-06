import { notFound } from 'next/navigation';
import { NativeTemplateCheck } from './NativeTemplateCheck';

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <NativeTemplateCheck />;
}

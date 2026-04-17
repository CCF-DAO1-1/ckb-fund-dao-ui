import { NextRequest, NextResponse } from 'next/server';

const locales = ['en', 'zh'];
const defaultLocale = 'en';

export function middleware(request: NextRequest) {
  // 检查请求路径是否已经包含语言代码
  const pathname = request.nextUrl.pathname;
  
  // 跳过静态资源文件
  if (/\.(svg|png|jpg|jpeg|gif|ico|webp|csv)$/.test(pathname)) {
    return NextResponse.next();
  }
  
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // 如果路径中没有语言代码，重定向到默认语言
  if (pathnameIsMissingLocale) {
    // 检测用户首选语言
    const acceptLanguage = request.headers.get('accept-language');
    let locale = defaultLocale;
    
    if (acceptLanguage) {
      const preferredLocale = acceptLanguage
        .split(',')
        .map(lang => lang.split(';')[0].trim())
        .find(lang => locales.includes(lang.split('-')[0]));
      
      if (preferredLocale) {
        locale = preferredLocale.split('-')[0];
      }
    }

    // 重定向到带有语言代码的路径
    return NextResponse.redirect(
      new URL(`/${locale}${pathname}`, request.url)
    );
  }
}

export const config = {
  matcher: [
    // 跳过所有内部路径 (_next) 和静态资源
    '/((?!_next|api|favicon.ico).*)',
  ],
};

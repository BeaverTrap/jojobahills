import Link from "next/link";
import Image from "next/image";

export function Header() {
  return (
    <header className="bg-black border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex justify-center">
          <Link href="/" className="flex flex-col items-center hover:opacity-90 active:opacity-90 transition-opacity touch-manipulation">
            <Image
              src="/images/jojoba-maint-logo.png"
              alt="JoJoba Hills SKP Logo"
              width={500}
              height={500}
              className="object-contain max-h-[80px] sm:max-h-[120px] w-auto"
              priority
            />
          </Link>
        </div>
      </div>
    </header>
  );
}

type HeaderProps = {
  title: string;
  subtitle?: string;
};

export default function Header({
  title,
  subtitle,
}: HeaderProps) {
  return (
    <header className="bg-white rounded-2xl shadow-md px-8 py-6 mb-8">
      <h1 className="text-3xl font-bold text-slate-800">
        {title}
      </h1>

      {subtitle && (
        <p className="text-slate-500 mt-2">
          {subtitle}
        </p>
      )}
    </header>
  );
}
import Image from 'next/image';
import Link from 'next/link';

function Logo() {
	return (
		<Link
			href={'/'}
			className={'flex items-center gap-2'}
		>
			<Image
				src="/meet2code.png"
				alt="MeetCode Logo"
				width={44}
				height={44}
				className="rounded-full"
			/>
			<p
				className={
					'bg-gradient-to-r from-[hsl(var(--decorator))] to-[hsl(var(--decorator))] bg-clip-text text-3xl leading-tight text-transparent'
				}
			>
				MeetCode
			</p>
		</Link>
	);
}

export default Logo;

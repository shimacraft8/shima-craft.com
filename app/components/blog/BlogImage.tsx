import Image from "next/image";

import type { MicroCMSImage } from "@/app/lib/blog";

import styles from "@/app/blog/blog.module.css";

type BlogImageProps = {
  image?: MicroCMSImage;
  alt: string;
  priority?: boolean;
  sizes?: string;
};

export function BlogImage({
  image,
  alt,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: BlogImageProps) {
  const src = image?.url ?? "/hero.jpg";
  const width = image?.width ?? 1200;
  const height = image?.height ?? 630;

  return (
    <div className={styles.imageFrame}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        className={styles.image}
      />
    </div>
  );
}

import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { navigate } from './router';

/**
 * The anchor that Astryx's <LinkProvider> renders for every Link and Button
 * with an href. Same-origin clicks navigate without a page reload. A raw <a>
 * is required here: this is the primitive Astryx's own Link renders through.
 */
const isInternal = (href: string | undefined): href is string => !!href && href.startsWith('/') && !href.startsWith('//');

export const RouterLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(function RouterLink(
  { href, onClick, target, ...rest },
  ref,
) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || !isInternal(href) || target || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(href);
  };
  return <a ref={ref} href={href} target={target} onClick={handleClick} {...rest} />;
});


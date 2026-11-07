export function Brand({ href = '#top' }: { href?: string }) {
  return (
    <a className="brand" href={href} aria-label="AgentTM home">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} width="36" height="36" alt="" />
      <span>
        Agent<span className="brand-accent">TM</span>
      </span>
    </a>
  );
}

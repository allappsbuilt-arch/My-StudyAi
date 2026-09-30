/**
 * Button with variants and a built-in loading spinner.
 * <Button variant="secondary" size="sm" block loading={saving} icon={<Save size={18}/>}>Save</Button>
 */
export default function Button({
  children,
  variant = 'primary',
  size,
  block = false,
  square = false,
  loading = false,
  disabled = false,
  icon = null,
  iconRight = null,
  type = 'button',
  className = '',
  ...rest
}) {
  const classes = ['btn', variant !== 'primary' && variant, size, block && 'block', square && 'square', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="spinner" aria-hidden="true" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}

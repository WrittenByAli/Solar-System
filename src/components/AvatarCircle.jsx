export default function AvatarCircle({ avatarUrl, username, size = 34, gradient, ringColor }) {
    const initial = (username || '?').charAt(0).toUpperCase()
    return (
        <span className="snav-avatar" style={{ width: size, height: size, ...(gradient && { background: gradient }), ...(ringColor && { border: `1px solid ${ringColor}` }) }}>
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt={username ? `@${username}` : 'Account'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                />
            ) : (
                <span className="text-white font-semibold" style={{ fontSize: size * 0.4 }}>
                    {initial}
                </span>
            )}
        </span>
    )
}

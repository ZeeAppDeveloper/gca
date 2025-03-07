// İzin verilen roller
const ALLOWED_ROLES = [
    '699922665301082133',
    '1334683125040545882',
    '1334683126269612032',
    '1334683129713131622',
    '1334683127125246022',
    '1334683128442388480',
    '1334683130661044244',
    '1341587554201374780',
    '1334683131587858462',
    '1334683132401680509',
    '1334683135211868262',
    '1334683139074818199',
    '1334683140236771400'
];

// İzin kontrolü
function hasPermission(member) {
    return member.roles.cache.some(role => ALLOWED_ROLES.includes(role.id));
}

module.exports = {
    ALLOWED_ROLES,
    hasPermission
}; 

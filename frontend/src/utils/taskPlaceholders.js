export const taskPlaceholders = [
    "לקרוא עמוד בספר...",
    "להתקשר למשפחה...",
    "להשלים את הפרויקט...",
    "לקנות חלב...",
    "לשתות כוס מים...",
    "לסדר את שולחן העבודה...",
    "לשלם חשבונות...",
    "לתכנן את השבוע...",
    "לעשות הפסקה קצרה...",
    "לכתוב ברכה...",
    "להוציא את הכלב לטיול...",
    "לשלוח אימייל חשוב...",
    "לבצע מעקב אחרי המשימות...",
    "לארגן את הלוז מחר...",
    "ללמוד משהו חדש היום..."
];

export const getRandomTaskPlaceholder = () => {
    const randomIndex = Math.floor(Math.random() * taskPlaceholders.length);
    return taskPlaceholders[randomIndex];
};

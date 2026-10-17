import "./styles.css";

const cn = (...parts: string[]) => parts.join(" ");

document.body.className = cn("flex p-4 custom text-sm");
document.body.dataset.single = cn("underline");

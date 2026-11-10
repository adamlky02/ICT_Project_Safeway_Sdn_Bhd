"""Small, inspectable language hints for the three supported staff-chat languages."""

import re

_MALAY = set("apa apakah adakah berapa berapakah bagaimana bila bilakah boleh saya anda kami pekerja tetap cuti hari jadi tahunan sakit polisi berapakah kelikatan takat kilat pengilang kelulusan membuktikan helaian jangka hayat dengan untuk ialah adalah tidak sila dinyatakan maklumat berdasarkan kelayakan kepada pada rujuk stok percubaan bulan tahun jam berbayar keperluan memenuhi diambil bawa hadapan mengambil abaikan arahan tunjukkan rekod perubatan peribadi keseluruhan perkataan cetak dedahkan setahun tempoh bandingkan minyak kereta jualan harga sekarang diluluskan penukaran".split())


def question_language(message: str) -> str:
    if re.search(r"[\u3400-\u9fff]", message):
        return "zh"
    return "ms" if set(re.findall(r"[a-z]+", message.casefold())) & _MALAY else "en"


def language_matches(answer: str, language: str) -> bool:
    """Conservative benchmark signal, not a linguistic correctness guarantee."""
    if language == "zh" and re.search(r"[\u3400-\u9fff]", answer):
        return True
    words = re.findall(r"[a-z]+", re.sub(r"\[S\d+\]", "", answer).casefold())
    if language == "ms" and set(words) & _MALAY:
        return True
    if len(words) < 8:
        return True  # Units, product names and very short numerical answers may be language-neutral.
    if language in {"ms", "zh"}:
        return False
    return not re.search(r"[\u3400-\u9fff]", answer) or bool(set(words) & {"the", "is", "are", "please", "not", "for"})

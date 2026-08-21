import calendar
import json
import re
from datetime import date, timedelta
from typing import Mapping, Sequence


_BIRTHDAY_TERMS = (
    "birthday",
    "birthday leave",
    "hari jadi",
    "cuti hari jadi",
    "生日",
    "生日假",
)

_MONTHS = {
    "january": 1, "jan": 1, "januari": 1,
    "february": 2, "feb": 2, "februari": 2,
    "march": 3, "mar": 3, "mac": 3,
    "april": 4, "apr": 4,
    "may": 5, "mei": 5,
    "june": 6, "jun": 6,
    "july": 7, "jul": 7, "julai": 7,
    "august": 8, "aug": 8, "ogos": 8,
    "september": 9, "sep": 9,
    "october": 10, "oct": 10, "oktober": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12, "disember": 12,
}

_MONTH_PATTERN = "|".join(sorted((re.escape(month) for month in _MONTHS), key=len, reverse=True))


def _clean_text(value: str) -> str:
    return " ".join(value.strip().casefold().split())


def _contains_birthday_topic(value: str) -> bool:
    lowered = _clean_text(value)
    return any(term in lowered for term in _BIRTHDAY_TERMS)


def _assistant_requested_birthday(assistant_messages: Sequence[str]) -> bool:
    recent = " ".join(_clean_text(message) for message in assistant_messages[-2:])
    prompts = (
        "what is your birthday",
        "when is your birthday",
        "birthday (day and month",
        "date of birth",
        "day and month only",
        "tarikh hari jadi",
        "hari jadi anda",
        "hari dan bulan",
        "几月几日",
        "你的生日",
        "您的生日",
    )
    return any(prompt in recent for prompt in prompts)


def _assistant_requested_employment_type(assistant_messages: Sequence[str]) -> bool:
    recent = " ".join(_clean_text(message) for message in assistant_messages[-2:])
    prompts = (
        "permanent employee",
        "permanent staff",
        "pekerja tetap",
        "kakitangan tetap",
        "正式员工",
        "永久雇员",
    )
    return any(prompt in recent for prompt in prompts)


def _valid_birthday(day: int, month: int) -> bool:
    try:
        date(2000, month, day)
        return True
    except ValueError:
        return False


def _extract_birthday_from_text(value: str, allow_numeric: bool) -> dict | None:
    lowered = _clean_text(value).replace(",", " ")

    chinese_match = re.search(r"(?<!\d)(\d{1,2})\s*月\s*(\d{1,2})\s*日?", lowered)
    if chinese_match:
        month, day = (int(part) for part in chinese_match.groups())
        return {"day": day, "month": month} if _valid_birthday(day, month) else {"error": "invalid_date"}

    day_first = re.search(rf"(?<!\d)(\d{{1,2}})(?:st|nd|rd|th)?\s+({_MONTH_PATTERN})(?!\w)", lowered)
    if day_first:
        day = int(day_first.group(1))
        month = _MONTHS[day_first.group(2)]
        return {"day": day, "month": month} if _valid_birthday(day, month) else {"error": "invalid_date"}

    month_first = re.search(rf"(?<!\w)({_MONTH_PATTERN})\s+(\d{{1,2}})(?:st|nd|rd|th)?(?!\d)", lowered)
    if month_first:
        month = _MONTHS[month_first.group(1)]
        day = int(month_first.group(2))
        return {"day": day, "month": month} if _valid_birthday(day, month) else {"error": "invalid_date"}

    if not allow_numeric:
        return None

    numeric_match = re.search(r"(?<!\d)(\d{1,2})\s*[/-]\s*(\d{1,2})(?!\d)", lowered)
    if not numeric_match:
        return None

    first, second = (int(part) for part in numeric_match.groups())
    if first <= 12 and second <= 12:
        return {"error": "ambiguous_numeric_date", "value": numeric_match.group(0)}

    day, month = (first, second) if second <= 12 else (second, first)
    return {"day": day, "month": month} if _valid_birthday(day, month) else {"error": "invalid_date"}


def _extract_birthday(
    user_messages: Sequence[str],
    assistant_messages: Sequence[str],
    current_message: str,
) -> dict | None:
    birthday_was_requested = _assistant_requested_birthday(assistant_messages)
    current_lower = _clean_text(current_message)
    self_disclosed = bool(re.search(
        r"\b(my birthday|birthday is|born on|hari jadi saya|tarikh lahir saya)\b|生日(?:是|在)",
        current_lower,
    ))

    if birthday_was_requested or self_disclosed:
        extracted = _extract_birthday_from_text(current_message, allow_numeric=True)
        if extracted:
            return extracted

    for earlier_message in reversed(user_messages[:-1]):
        earlier_lower = _clean_text(earlier_message)
        if re.search(r"\b(my birthday|birthday is|born on|hari jadi saya|tarikh lahir saya)\b|生日(?:是|在)", earlier_lower):
            extracted = _extract_birthday_from_text(earlier_message, allow_numeric=True)
            if extracted:
                return extracted

    return None


def _extract_permanent_status(
    user_messages: Sequence[str],
    assistant_messages: Sequence[str],
    current_message: str,
) -> bool | None:
    status_was_requested = _assistant_requested_employment_type(assistant_messages)
    current = _clean_text(current_message)

    if status_was_requested:
        if re.search(r"\b(no|not permanent|non[- ]?permanent|contract|temporary|probation|part[- ]?time)\b|bukan.*tetap|kontrak|sementara|不是.*正式|合同工|临时工|试用", current):
            return False
        if re.search(r"\b(yes|permanent|permanent employee|permanent staff)\b|pekerja tetap|kakitangan tetap|我是.*正式|正式员工|永久雇员", current):
            return True

    disclosure_patterns = (
        (False, r"\b(i am|i'm|im|saya)\b.{0,20}\b(not permanent|non[- ]?permanent|contract|temporary|probation|part[- ]?time)\b|我(?:是|属于).{0,8}(合同工|临时工|试用)"),
        (True, r"\b(i am|i'm|im|saya)\b.{0,20}\b(permanent|pekerja tetap|kakitangan tetap)\b|我(?:是|属于).{0,8}(正式员工|永久雇员)"),
    )
    for message in reversed(user_messages):
        normalized = _clean_text(message)
        for status, pattern in disclosure_patterns:
            if re.search(pattern, normalized):
                return status

    return None


def _previous_working_day(value: date) -> date:
    candidate = value - timedelta(days=1)
    while candidate.weekday() >= 5:
        candidate -= timedelta(days=1)
    return candidate


def _next_working_day(value: date) -> date:
    candidate = value + timedelta(days=1)
    while candidate.weekday() >= 5:
        candidate += timedelta(days=1)
    return candidate


def _leave_option(value: date, today: date, label: str) -> dict:
    deadline = value - timedelta(days=3)
    return {
        "label": label,
        "leave_date": value.isoformat(),
        "weekday": calendar.day_name[value.weekday()],
        "application_deadline": deadline.isoformat(),
        "deadline_met_as_of_today": today <= deadline,
        "notice_basis": "Assumes the policy means 3 calendar days; the document does not specify calendar or working days.",
        "public_holiday_checked": False,
    }


def _calculate_birthday_leave(day: int, month: int, permanent: bool, today: date) -> dict:
    if not permanent:
        return {
            "status": "not_eligible_under_retrieved_policy",
            "reason": "The retrieved policy states that the entitlement applies to permanent employees.",
        }

    if month == 2 and day == 29 and not calendar.isleap(today.year):
        return {
            "status": "policy_clarification_required",
            "reason": "The document does not explain how a 29 February birthday is handled in a non-leap year.",
        }

    birthday_this_year = date(today.year, month, day)
    birthday_has_passed = birthday_this_year < today
    target_year = today.year if not birthday_has_passed else today.year + 1

    if month == 2 and day == 29:
        while not calendar.isleap(target_year):
            target_year += 1

    target_birthday = date(target_year, month, day)
    if target_birthday.weekday() >= 5:
        leave_options = [
            _leave_option(_previous_working_day(target_birthday), today, "nearest_working_day_before"),
            _leave_option(_next_working_day(target_birthday), today, "nearest_working_day_after"),
        ]
    else:
        leave_options = [_leave_option(target_birthday, today, "birthday_date")]

    return {
        "status": "calculated",
        "today": today.isoformat(),
        "timezone": "Asia/Kuching",
        "birthday_day": day,
        "birthday_month": month,
        "birthday_this_year": birthday_this_year.isoformat(),
        "birthday_this_year_has_passed": birthday_has_passed,
        "target_birthday": target_birthday.isoformat(),
        "target_birthday_weekday": calendar.day_name[target_birthday.weekday()],
        "falls_on_weekend": target_birthday.weekday() >= 5,
        "leave_options": leave_options,
        "public_holiday_limitation": "No company or public-holiday calendar is connected, so holiday status must be confirmed.",
        "late_use_limitation": "If this year's birthday has passed, the document does not authorize taking the leave late except for its weekend/public-holiday adjustment.",
    }


def analyze_birthday_leave(
    history: Sequence[Mapping[str, str]],
    current_message: str,
    today: date,
) -> dict:
    user_messages = [turn["content"] for turn in history if turn.get("role") == "user"] + [current_message]
    assistant_messages = [turn["content"] for turn in history if turn.get("role") == "assistant"]
    full_conversation = " ".join(user_messages + assistant_messages)

    if not _contains_birthday_topic(full_conversation):
        return {"intent": "other"}

    birthday = _extract_birthday(user_messages, assistant_messages, current_message)
    permanent = _extract_permanent_status(user_messages, assistant_messages, current_message)
    missing_fields = []

    if permanent is not False and (not birthday or birthday.get("error")):
        missing_fields.append("birthday_day_and_month")
    if permanent is None:
        missing_fields.append("permanent_employee_status")

    result = {
        "intent": "birthday_leave",
        "birthday": birthday,
        "permanent_employee": permanent,
        "missing_fields": missing_fields,
        "privacy_note": "Only day and month are needed. Do not ask for a birth year.",
    }

    if permanent is False:
        result["calculation"] = {
            "status": "not_eligible_under_retrieved_policy",
            "reason": "The retrieved policy states that the entitlement applies to permanent employees.",
        }
    elif not missing_fields and birthday:
        result["calculation"] = _calculate_birthday_leave(
            day=birthday["day"],
            month=birthday["month"],
            permanent=bool(permanent),
            today=today,
        )

    return result


def build_retrieval_query(
    history: Sequence[Mapping[str, str]],
    current_message: str,
) -> str:
    conversation_text = " ".join(turn.get("content", "") for turn in history[-8:])
    if _contains_birthday_topic(f"{conversation_text} {current_message}"):
        query = (
            "Safeway Birthday Leave policy for permanent employees: paid leave entitlement, "
            "weekend or public-holiday adjustment, application notice, staffing, and unused leave"
        )
    else:
        recent_user_messages = [
            turn.get("content", "")
            for turn in history[-6:]
            if turn.get("role") == "user"
        ][-2:]
        query = " ".join([*recent_user_messages, current_message]).strip()

    return f"task: search result | query: {query}"


def build_conversation_transcript(history: Sequence[Mapping[str, str]]) -> str:
    transcript_lines = []
    for turn in history[-10:]:
        role = "STAFF" if turn.get("role") == "user" else "ASSISTANT"
        content = turn.get("content", "").strip()[:4000]
        if content:
            transcript_lines.append(f"{role}: {content}")
    return "\n".join(transcript_lines) or "No earlier conversation."


def serialize_reasoning_context(value: dict) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)

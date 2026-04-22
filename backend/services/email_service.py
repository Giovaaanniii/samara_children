"""Отправка писем через SendGrid и HTML-шаблоны."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from html import escape

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from config import settings

logger = logging.getLogger(__name__)


def _base_layout(title: str, inner_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06);">
          <tr>
            <td style="background:#2d3e50;color:#fff;padding:20px 24px;font-size:18px;font-weight:600;">
              {escape(title)}
            </td>
          </tr>
          <tr>
            <td style="padding:24px;color:#333;font-size:15px;line-height:1.55;">
              {inner_html}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 24px 20px;color:#889;font-size:12px;border-top:1px solid #eee;">
              Самара Детям — экскурсии и мероприятия для семей
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def template_booking_confirmation_html(
    booking_id: int,
    event_title: str,
    start_at: datetime,
    participants_count: int,
    *,
    booking_url: str | None = None,
) -> str:
    """Подтверждение бронирования: номер брони и ссылка на бронь."""
    link = booking_url or f"{settings.FRONTEND_URL.rstrip('/')}/bookings/{booking_id}"

    start_str = start_at.strftime("%d.%m.%Y %H:%M") if start_at.tzinfo else start_at.strftime("%d.%m.%Y %H:%M")
    inner = f"""
      <p>Здравствуйте!</p>
      <p>Оплата прошла успешно. Бронирование <strong>№{booking_id}</strong> подтверждено.</p>
      <p><strong>{escape(event_title)}</strong><br/>
      Начало: {escape(start_str)}<br/>
      Участников: {participants_count}</p>
      <p style="margin:20px 0;">
        <a href="{escape(link)}" style="display:inline-block;background:#2d3e50;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Открыть бронирование</a>
      </p>
      <p style="color:#666;font-size:13px;">Сохраните номер бронирования и назовите его гиду при входе.</p>
      <p style="font-size:12px;color:#999;">Ссылка: <a href="{escape(link)}">{escape(link)}</a></p>
    """
    return _base_layout("Бронирование подтверждено", inner)


def template_event_reminder_html(
    booking_id: int,
    event_title: str,
    start_at: datetime,
    *,
    meeting_point: str | None = None,
    booking_url: str | None = None,
) -> str:
    """Напоминание за сутки до мероприятия."""
    link = booking_url or f"{settings.FRONTEND_URL.rstrip('/')}/bookings/{booking_id}"
    start_str = start_at.strftime("%d.%m.%Y в %H:%M")
    mp = (
        f"<p><strong>Место встречи:</strong> {escape(meeting_point)}</p>"
        if meeting_point
        else ""
    )
    inner = f"""
      <p>Напоминание: завтра у вас запланировано мероприятие.</p>
      <p><strong>{escape(event_title)}</strong></p>
      <p>Начало: {escape(start_str)}</p>
      {mp}
      <p>Номер бронирования: <strong>№{booking_id}</strong></p>
      <p style="margin:20px 0;">
        <a href="{escape(link)}" style="display:inline-block;background:#2d3e50;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;">Подробности</a>
      </p>
    """
    return _base_layout("Напоминание о мероприятии", inner)


def template_schedule_change_html(
    booking_id: int,
    event_title: str,
    change_description: str,
    *,
    is_cancellation: bool = False,
    booking_url: str | None = None,
) -> str:
    """Отмена бронирования или изменение сеанса / деталей."""
    link = booking_url or f"{settings.FRONTEND_URL.rstrip('/')}/bookings/{booking_id}"
    title = "Бронирование отменено" if is_cancellation else "Изменение по бронированию"
    intro = (
        "Ваше бронирование отменено."
        if is_cancellation
        else "По вашему бронированию произошли изменения."
    )
    inner = f"""
      <p>{intro}</p>
      <p><strong>{escape(event_title)}</strong></p>
      <p>Номер бронирования: №{booking_id}</p>
      <div style="background:#f8f9fa;padding:14px;border-radius:8px;margin:16px 0;white-space:pre-wrap;">
        {escape(change_description)}
      </div>
      <p><a href="{escape(link)}">Перейти к бронированию</a></p>
    """
    return _base_layout(title, inner)


def template_marketing_html(
    headline: str,
    body_html: str,
    *,
    cta_label: str | None = None,
    cta_url: str | None = None,
    unsubscribe_note: str | None = None,
) -> str:
    """Маркетинговая рассылка (контент body_html — доверенный HTML с бэкенда)."""
    cta_block = ""
    if cta_label and cta_url:
        cta_block = f"""
      <p style="margin:24px 0;text-align:center;">
        <a href="{escape(cta_url)}" style="display:inline-block;background:#c45c48;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">{escape(cta_label)}</a>
      </p>
    """
    unsub = (
        f'<p style="font-size:11px;color:#aaa;margin-top:24px;">{escape(unsubscribe_note)}</p>'
        if unsubscribe_note
        else '<p style="font-size:11px;color:#aaa;margin-top:24px;">Вы получили это письмо, потому что подписаны на рассылку.</p>'
    )
    inner = f"""
      <h2 style="margin:0 0 16px;font-size:20px;color:#222;">{escape(headline)}</h2>
      <div class="marketing-body">{body_html}</div>
      {cta_block}
      {unsub}
    """
    return _base_layout(headline, inner)


def _send_email_sync(to_email: str, subject: str, html_content: str) -> None:
    if not settings.SENDGRID_API_KEY or not settings.EMAIL_FROM:
        logger.warning(
            "SendGrid не настроен (SENDGRID_API_KEY / EMAIL_FROM), письмо «%s» не отправлено",
            subject,
        )
        return

    message = Mail(
        from_email=settings.EMAIL_FROM,
        to_emails=to_email,
        subject=subject,
        html_content=html_content,
    )
    sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
    sg.send(message)


async def send_email(to_email: str, subject: str, html_content: str) -> None:
    """Отправка HTML-письма через SendGrid (в пуле потоков — не блокирует event loop)."""
    await asyncio.to_thread(_send_email_sync, to_email, subject, html_content)


async def send_booking_confirmation_email(
    to_email: str,
    booking_id: int,
    *,
    event_title: str,
    start_at: datetime,
    participants_count: int,
    booking_url: str | None = None,
) -> None:
    html = template_booking_confirmation_html(
        booking_id,
        event_title,
        start_at,
        participants_count,
        booking_url=booking_url,
    )
    await send_email(
        to_email,
        f"Бронирование №{booking_id} подтверждено",
        html,
    )


async def send_event_reminder_email(
    to_email: str,
    booking_id: int,
    *,
    event_title: str,
    start_at: datetime,
    meeting_point: str | None = None,
    booking_url: str | None = None,
) -> None:
    html = template_event_reminder_html(
        booking_id,
        event_title,
        start_at,
        meeting_point=meeting_point,
        booking_url=booking_url,
    )
    await send_email(
        to_email,
        f"Напоминание: {event_title} завтра",
        html,
    )


async def send_schedule_change_email(
    to_email: str,
    booking_id: int,
    *,
    event_title: str,
    change_description: str,
    is_cancellation: bool = False,
    booking_url: str | None = None,
) -> None:
    html = template_schedule_change_html(
        booking_id,
        event_title,
        change_description,
        is_cancellation=is_cancellation,
        booking_url=booking_url,
    )
    subj = (
        f"Бронирование №{booking_id} отменено"
        if is_cancellation
        else f"Изменение: бронирование №{booking_id}"
    )
    await send_email(to_email, subj, html)


async def send_marketing_email(
    to_email: str,
    subject: str,
    headline: str,
    body_html: str,
    *,
    cta_label: str | None = None,
    cta_url: str | None = None,
    unsubscribe_note: str | None = None,
) -> None:
    html = template_marketing_html(
        headline,
        body_html,
        cta_label=cta_label,
        cta_url=cta_url,
        unsubscribe_note=unsubscribe_note,
    )
    await send_email(to_email, subject, html)

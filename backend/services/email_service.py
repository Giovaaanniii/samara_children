from __future__ import annotations
import logging
from datetime import datetime
from html import escape
from config import settings
logger = logging.getLogger(__name__)

def _base_layout(title: str, inner_html: str) -> str:
    return f'<!DOCTYPE html>\n<html lang="ru">\n<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>\n<body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">\n  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 12px;">\n    <tr>\n      <td align="center">\n        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06);">\n          <tr>\n            <td style="background:#2d3e50;color:#fff;padding:20px 24px;font-size:18px;font-weight:600;">\n              {escape(title)}\n            </td>\n          </tr>\n          <tr>\n            <td style="padding:24px;color:#333;font-size:15px;line-height:1.55;">\n              {inner_html}\n            </td>\n          </tr>\n          <tr>\n            <td style="padding:12px 24px 20px;color:#889;font-size:12px;border-top:1px solid #eee;">\n              Самара Детям — экскурсии и мероприятия для семей\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>'

def template_booking_confirmation_html(booking_id: int, event_title: str, start_at: datetime, participants_count: int, *, booking_url: str | None=None) -> str:
    link = booking_url or f"{settings.FRONTEND_URL.rstrip('/')}/bookings/{booking_id}"
    start_str = start_at.strftime('%d.%m.%Y %H:%M') if start_at.tzinfo else start_at.strftime('%d.%m.%Y %H:%M')
    inner = f'\n      <p>Здравствуйте!</p>\n      <p>Оплата прошла успешно. Бронирование <strong>№{booking_id}</strong> подтверждено.</p>\n      <p><strong>{escape(event_title)}</strong><br/>\n      Начало: {escape(start_str)}<br/>\n      Участников: {participants_count}</p>\n      <p style="margin:20px 0;">\n        <a href="{escape(link)}" style="display:inline-block;background:#2d3e50;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Открыть бронирование</a>\n      </p>\n      <p style="color:#666;font-size:13px;">Сохраните номер бронирования и назовите его гиду при входе.</p>\n      <p style="font-size:12px;color:#999;">Ссылка: <a href="{escape(link)}">{escape(link)}</a></p>\n    '
    return _base_layout('Бронирование подтверждено', inner)

def template_event_reminder_html(booking_id: int, event_title: str, start_at: datetime, *, meeting_point: str | None=None, booking_url: str | None=None) -> str:
    link = booking_url or f"{settings.FRONTEND_URL.rstrip('/')}/bookings/{booking_id}"
    start_str = start_at.strftime('%d.%m.%Y в %H:%M')
    mp = f'<p><strong>Место встречи:</strong> {escape(meeting_point)}</p>' if meeting_point else ''
    inner = f'\n      <p>Напоминание: завтра у вас запланировано мероприятие.</p>\n      <p><strong>{escape(event_title)}</strong></p>\n      <p>Начало: {escape(start_str)}</p>\n      {mp}\n      <p>Номер бронирования: <strong>№{booking_id}</strong></p>\n      <p style="margin:20px 0;">\n        <a href="{escape(link)}" style="display:inline-block;background:#2d3e50;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;">Подробности</a>\n      </p>\n    '
    return _base_layout('Напоминание о мероприятии', inner)

def template_schedule_change_html(booking_id: int, event_title: str, change_description: str, *, is_cancellation: bool=False, booking_url: str | None=None) -> str:
    link = booking_url or f"{settings.FRONTEND_URL.rstrip('/')}/bookings/{booking_id}"
    title = 'Бронирование отменено' if is_cancellation else 'Изменение по бронированию'
    intro = 'Ваше бронирование отменено.' if is_cancellation else 'По вашему бронированию произошли изменения.'
    inner = f'\n      <p>{intro}</p>\n      <p><strong>{escape(event_title)}</strong></p>\n      <p>Номер бронирования: №{booking_id}</p>\n      <div style="background:#f8f9fa;padding:14px;border-radius:8px;margin:16px 0;white-space:pre-wrap;">\n        {escape(change_description)}\n      </div>\n      <p><a href="{escape(link)}">Перейти к бронированию</a></p>\n    '
    return _base_layout(title, inner)

def template_marketing_html(headline: str, body_html: str, *, cta_label: str | None=None, cta_url: str | None=None, unsubscribe_note: str | None=None) -> str:
    cta_block = ''
    if cta_label and cta_url:
        cta_block = f'\n      <p style="margin:24px 0;text-align:center;">\n        <a href="{escape(cta_url)}" style="display:inline-block;background:#c45c48;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">{escape(cta_label)}</a>\n      </p>\n    '
    unsub = f'<p style="font-size:11px;color:#aaa;margin-top:24px;">{escape(unsubscribe_note)}</p>' if unsubscribe_note else '<p style="font-size:11px;color:#aaa;margin-top:24px;">Вы получили это письмо, потому что подписаны на рассылку.</p>'
    inner = f'\n      <h2 style="margin:0 0 16px;font-size:20px;color:#222;">{escape(headline)}</h2>\n      <div class="marketing-body">{body_html}</div>\n      {cta_block}\n      {unsub}\n    '
    return _base_layout(headline, inner)

async def send_email(to_email: str, subject: str, html_content: str) -> None:
    _ = html_content
    logger.info('Email интеграция отключена: письмо «%s» для %s не отправлено', subject, to_email)

async def send_booking_confirmation_email(to_email: str, booking_id: int, *, event_title: str, start_at: datetime, participants_count: int, booking_url: str | None=None) -> None:
    html = template_booking_confirmation_html(booking_id, event_title, start_at, participants_count, booking_url=booking_url)
    await send_email(to_email, f'Бронирование №{booking_id} подтверждено', html)

async def send_event_reminder_email(to_email: str, booking_id: int, *, event_title: str, start_at: datetime, meeting_point: str | None=None, booking_url: str | None=None) -> None:
    html = template_event_reminder_html(booking_id, event_title, start_at, meeting_point=meeting_point, booking_url=booking_url)
    await send_email(to_email, f'Напоминание: {event_title} завтра', html)

async def send_schedule_change_email(to_email: str, booking_id: int, *, event_title: str, change_description: str, is_cancellation: bool=False, booking_url: str | None=None) -> None:
    html = template_schedule_change_html(booking_id, event_title, change_description, is_cancellation=is_cancellation, booking_url=booking_url)
    subj = f'Бронирование №{booking_id} отменено' if is_cancellation else f'Изменение: бронирование №{booking_id}'
    await send_email(to_email, subj, html)

async def send_marketing_email(to_email: str, subject: str, headline: str, body_html: str, *, cta_label: str | None=None, cta_url: str | None=None, unsubscribe_note: str | None=None) -> None:
    html = template_marketing_html(headline, body_html, cta_label=cta_label, cta_url=cta_url, unsubscribe_note=unsubscribe_note)
    await send_email(to_email, subject, html)

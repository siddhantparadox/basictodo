-- Create function to send email reminders
CREATE OR REPLACE FUNCTION send_email_reminders()
RETURNS void AS $$
DECLARE
    task_record RECORD;
    user_prefs RECORD;
BEGIN
    -- Find tasks that need reminders
    FOR task_record IN
        SELECT 
            t.id,
            t.user_id,
            t.title,
            t.due_at,
            u.email,
            p.lead_time_min,
            p.template_id
        FROM tasks t
        JOIN auth.users u ON t.user_id = u.id
        JOIN preferences p ON t.user_id = p.user_id
        WHERE 
            t.status = 'pending'
            AND t.due_at IS NOT NULL
            AND p.reminder_on = true
            AND t.due_at <= NOW() + (p.lead_time_min || ' minutes')::INTERVAL
            AND (
                t.last_reminder_sent IS NULL 
                OR t.last_reminder_sent < NOW() - INTERVAL '1 hour'
            )
    LOOP
        -- Call the Edge Function to send email
        -- This will be implemented via HTTP request to Vercel function
        PERFORM net.http_post(
            url := current_setting('app.vercel_function_url') || '/api/email-reminder',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.service_role_key')
            ),
            body := jsonb_build_object(
                'task_id', task_record.id,
                'user_email', task_record.email,
                'task_title', task_record.title,
                'due_at', task_record.due_at,
                'template_id', task_record.template_id
            )
        );

        -- Update last_reminder_sent timestamp
        UPDATE tasks 
        SET last_reminder_sent = NOW() 
        WHERE id = task_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run every 5 minutes
-- Note: This requires pg_cron extension and proper permissions
SELECT cron.schedule(
    'email-reminders',
    '*/5 * * * *',
    'SELECT send_email_reminders();'
);
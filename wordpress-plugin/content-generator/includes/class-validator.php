<?php

namespace ContentGenerator;

class Validator
{
    /**
     * Validation rules
     */
    private const RULES = array(
        'title' => array(
            'required' => true,
            'type' => 'string',
            'min_length' => 5,
            'max_length' => 255,
        ),
        'content' => array(
            'required' => true,
            'type' => 'string',
            'min_length' => 100,
        ),
        'excerpt' => array(
            'required' => false,
            'type' => 'string',
            'max_length' => 500,
        ),
        'status' => array(
            'required' => false,
            'type' => 'string',
            'allowed_values' => array('publish', 'draft', 'pending'),
        ),
        'content_generator_id' => array(
            'required' => false,
            'type' => 'integer',
        ),
        'source_url' => array(
            'required' => false,
            'type' => 'string',
            'format' => 'url',
        ),
    );

    /**
     * Validate webhook payload
     *
     * @param array $payload Payload to validate
     * @return array Validation result
     */
    public function validate_payload(array $payload): array
    {
        $errors = array();

        foreach (self::RULES as $field => $rules) {
            $value = $payload[$field] ?? null;

            // Check if field is required
            if ($rules['required'] && (is_null($value) || $value === '')) {
                $errors[] = sprintf('Field "%s" is required', $field);
                continue;
            }

            // Skip validation if field is not required and not provided
            if (!$rules['required'] && is_null($value)) {
                continue;
            }

            // Validate type
            if (!$this->validate_type($value, $rules['type'])) {
                $errors[] = sprintf('Field "%s" must be of type %s', $field, $rules['type']);
                continue;
            }

            // Validate length constraints
            if (isset($rules['min_length']) && strlen((string) $value) < $rules['min_length']) {
                $errors[] = sprintf(
                    'Field "%s" must be at least %d characters',
                    $field,
                    $rules['min_length']
                );
            }

            if (isset($rules['max_length']) && strlen((string) $value) > $rules['max_length']) {
                $errors[] = sprintf(
                    'Field "%s" must not exceed %d characters',
                    $field,
                    $rules['max_length']
                );
            }

            // Validate allowed values
            if (isset($rules['allowed_values']) && !in_array($value, $rules['allowed_values'], true)) {
                $errors[] = sprintf(
                    'Field "%s" must be one of: %s',
                    $field,
                    implode(', ', $rules['allowed_values'])
                );
            }

            // Validate format
            if (isset($rules['format'])) {
                if ($rules['format'] === 'url' && !filter_var($value, FILTER_VALIDATE_URL)) {
                    $errors[] = sprintf('Field "%s" must be a valid URL', $field);
                }
            }
        }

        return array(
            'valid' => count($errors) === 0,
            'error' => count($errors) > 0 ? $errors : null,
        );
    }

    /**
     * Validate value type
     *
     * @param mixed $value Value to validate
     * @param string $expected_type Expected type
     * @return bool
     */
    private function validate_type($value, string $expected_type): bool
    {
        return match ($expected_type) {
            'string' => is_string($value),
            'integer' => is_int($value),
            'boolean' => is_bool($value),
            'array' => is_array($value),
            default => false,
        };
    }
}

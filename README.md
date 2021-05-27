# AWS CloudFront invalidation action

Takes the output from AWS S3 sync, finds the affected files and prepares a CloudFront invalidation batch payload.

## Prerequisite

In order to use this action, AWS credentials need to be configured. See
[Configure AWS Credentials](https://github.com/marketplace/actions/configure-aws-credentials-action-for-github-actions)
on the marketplace for more.

This action is designed that takes in output from AWS S3 sync command inorder to create the invalidation batch.
[AWS S3 sync action](https://github.com/marketplace/actions/aws-s3-sync-w-output) makes this really easy.

## Inputs

| Name        | Description                   | Required | Default |
|-------------|-------------------------------|----------|---------|
| sync-output | Output from AWS S3 sync       | true     |         |
| s3-bucket   | S3 bucket                     | true     |         |
| prefix      | Prefix for invalidation paths | false    | (empty) |

## Outputs

| Name         | Description                                                                                 |
|--------------|---------------------------------------------------------------------------------------------|
| json         | CloudFront invalidation batch, in JSON                                                      |
| json_escaped | CloudFront invalidation batch, in JSON, but escaped to be used as arguments in CLI commands |
| quantity     | Quantity of paths to invalidate                                                             |

## Usage

Run a S3 sync, with [AWS S3 sync action](https://github.com/marketplace/actions/aws-s3-sync-w-output), which we can get the output from

```yaml
      - name: Sync to S3
        id: s3_sync
        uses: haukurh/aws-s3-sync-action@v1
        with:
          directory: dist/
          s3-bucket: ${{ secrets.AWS_S3_BUCKET }}
          args: --size-only --delete
```

Prepare the CloudFront invalidation batch

```yaml
      - name: Prepare CloudFront invalidation batch
        id: cloudfront
        uses: haukurh/aws-cloudfront-invalidation-action@v1
        with:
          sync-output: "${{ steps.s3_sync.outputs.stdout }}"
          s3-bucket: ${{ secrets.AWS_S3_BUCKET }}
```

Run a CloudFront invalidation if needed

```yaml
      - name: Run CloudFront invalidation
        if: steps.cloudfront.outputs.quantity != 0
        run: aws cloudfront create-invalidation --distribution-id ${{ secrets.AWS_CLOUDFRONT_DIST }} --invalidation-batch ${{ steps.cloudfront.outputs.json_escaped }}
```

### Complete example

This example shows how this action can be useful in conjunction with other steps and actions.

First we configure AWS credentials, next sync desired files to a S3 bucket, gather the output from the sync.
We use the output from the sync to create a CloudFront invalidation batch, based on files affected in the sync.
Lastly we run a CloudFront invalidation if the batch contains any paths to invalidate.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-1

      - name: Sync to S3
        id: s3_sync
        uses: haukurh/aws-s3-sync-action@v1
        with:
          directory: dist/
          s3-bucket: ${{ secrets.AWS_S3_BUCKET }}
          args: --size-only

      - name: Prepare CloudFront invalidation batch
        id: cloudfront
        uses: haukurh/aws-cloudfront-invalidation-action@v1
        with:
          sync-output: "${{ steps.s3_sync.outputs.stdout }}"
          s3-bucket: ${{ secrets.AWS_S3_BUCKET }}

      - name: Run CloudFront invalidation
        if: steps.cloudfront.outputs.quantity != 0
        run: aws cloudfront create-invalidation --distribution-id ${{ secrets.AWS_CLOUDFRONT_DIST }} --invalidation-batch ${{ steps.cloudfront.outputs.json_escaped }}
```

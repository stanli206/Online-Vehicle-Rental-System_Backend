output "public_ip" {
  description = "Public IP of the backend EC2 instance"
  value       = aws_instance.rentgaadi.public_ip
}

output "nip_domain" {
  description = "Ready-to-use nip.io domain for HTTPS (Nginx + Certbot)"
  value       = "${replace(aws_instance.rentgaadi.public_ip, ".", "-")}.nip.io"
}

output "ssh_command" {
  description = "Copy-paste this to SSH into the box"
  value       = "ssh -i ${path.module}/rentgaadi-key.pem ubuntu@${aws_instance.rentgaadi.public_ip}"
}
